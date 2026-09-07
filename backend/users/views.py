from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, Address
from .serializers import (RegisterSerializer, LoginSerializer, UserSerializer,
                          AddressSerializer, ChangePasswordSerializer)


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from orders.services import merge_guest_cart
        merge_guest_cart(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        from orders.services import merge_guest_cart
        merge_guest_cart(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    # فقط برای تشخیص مدل توسط تولیدکنندهٔ اسکیما؛ در زمان اجرا get_queryset حاکم است.
    queryset = Address.objects.none()

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Address.objects.none()

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


@extend_schema(
    request=ChangePasswordSerializer,
    responses={200: inline_serializer('ChangePasswordResult', {'message': serializers.CharField()})},
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({'old_password': 'رمز عبور فعلی اشتباه است'}, status=400)
    user.set_password(serializer.validated_data['new_password'])
    user.save()
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
    return Response({'message': 'رمز عبور با موفقیت تغییر کرد'})


class AdminUserListView(generics.ListAPIView):
    """فقط superuser می‌تواند لیست ادمین‌ها را ببیند"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.none()

    def get_queryset(self):
        if not self.request.user.is_superuser:
            return User.objects.none()
        return User.objects.filter(is_staff=True).order_by('-date_joined')


@extend_schema(
    request=inline_serializer('AdminCreateUser', {
        'username': serializers.CharField(),
        'password': serializers.CharField(write_only=True),
        'email': serializers.EmailField(required=False, allow_blank=True),
        'first_name': serializers.CharField(required=False, allow_blank=True),
        'last_name': serializers.CharField(required=False, allow_blank=True),
        'is_superuser': serializers.BooleanField(required=False, default=False),
    }),
    responses={201: UserSerializer},
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_create_user(request):
    """ساخت یوزر ادمین جدید — فقط superuser"""
    if not request.user.is_superuser:
        return Response({'error': 'دسترسی ندارید'}, status=403)

    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email = request.data.get('email', '').strip()
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    is_superuser = request.data.get('is_superuser', False)

    if not username or not password:
        return Response({'error': 'نام کاربری و رمز عبور الزامی است'}, status=400)
    try:
        validate_password(password, user=User(username=username, email=email))
    except DjangoValidationError as exc:
        return Response({'password': list(exc.messages)}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'این نام کاربری قبلاً ثبت شده'}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=password,
        is_staff=True,
        is_superuser=bool(is_superuser),
    )
    return Response(UserSerializer(user).data, status=201)


@extend_schema(
    request=None,
    responses={200: inline_serializer('AdminDeleteUserResult', {'message': serializers.CharField()})},
)
@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def admin_delete_user(request, user_id):
    """حذف ادمین — فقط superuser و نه خودش"""
    if not request.user.is_superuser:
        return Response({'error': 'دسترسی ندارید'}, status=403)
    try:
        user = User.objects.get(id=user_id, is_staff=True)
    except User.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=404)
    if user.id == request.user.id:
        return Response({'error': 'نمی‌توانید حساب خود را حذف کنید'}, status=400)
    user.delete()
    return Response({'message': 'حذف شد'})


@extend_schema(
    request=inline_serializer('LogoutRequest', {'refresh': serializers.CharField()}),
    responses={200: inline_serializer('LogoutResult', {'message': serializers.CharField()})},
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'با موفقیت خارج شدید'})
    except Exception:
        return Response({'error': 'توکن نامعتبر'}, status=400)
