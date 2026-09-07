from django.db import transaction
from django.db.models import Count
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import SiteSettings
from users.models import User
from users.serializers import UserSerializer

from .models import OtpCode, SmsLog
from .serializers import OtpRequestSerializer, OtpVerifySerializer, SmsLogSerializer, SmsSendSerializer
from .services import create_otp, send_sms, verify_otp


class OtpThrottle(SimpleRateThrottle):
    """محدودیت بر اساس IP — روی اندپوینت‌های OTP که کاربر هنوز احراز نشده."""

    scope = 'otp'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


def _resolve_otp_user(phone: str) -> tuple[User, bool]:
    user = User.objects.filter(phone=phone).first()
    if user:
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=['is_verified'])
        return user, False

    username = phone
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f'{phone}-{suffix}'
    return User.objects.create_user(username=username, phone=phone, is_verified=True), True


@extend_schema(
    request=OtpRequestSerializer,
    responses={200: inline_serializer('OtpRequestResult', {
        'message': serializers.CharField(),
        'expires_in': serializers.IntegerField(),
        'resend_after': serializers.IntegerField(),
    })},
)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([OtpThrottle])
def request_otp(request):
    if not SiteSettings.load().otp_login_enabled:
        return Response({'error': 'ورود با پیامک فعال نیست.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    serializer = OtpRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    _otp, error = create_otp(serializer.validated_data['phone'], purpose='login')
    if error:
        return Response({'error': error}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    return Response({
        'message': 'کد تأیید ارسال شد.',
        'expires_in': OtpCode.TTL_SECONDS,
        'resend_after': OtpCode.RESEND_COOLDOWN_SECONDS,
    })


@extend_schema(
    request=OtpVerifySerializer,
    responses={200: inline_serializer('OtpLoginResult', {
        'user': UserSerializer(),
        'is_new_user': serializers.BooleanField(),
        'tokens': inline_serializer('JwtTokenPair', {
            'refresh': serializers.CharField(),
            'access': serializers.CharField(),
        }),
    })},
)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([OtpThrottle])
def verify_otp_login(request):
    if not SiteSettings.load().otp_login_enabled:
        return Response({'error': 'ورود با پیامک فعال نیست.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    serializer = OtpVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    phone = serializer.validated_data['phone']

    ok, error = verify_otp(phone, serializer.validated_data['code'], purpose='login')
    if not ok:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user, created = _resolve_otp_user(phone)

    from orders.services import merge_guest_cart

    merge_guest_cart(request, user)
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'is_new_user': created,
        'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
    })


class AdminSmsLogListView(generics.ListAPIView):
    serializer_class = SmsLogSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = SmsLog.objects.all()
    filterset_fields = ['status', 'kind']
    search_fields = ['phone', 'message']


@extend_schema(
    request=SmsSendSerializer,
    responses={200: inline_serializer('AdminSmsSendResult', {
        'message': serializers.CharField(),
        'log': SmsLogSerializer(),
    })},
)
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_send_sms(request):
    serializer = SmsSendSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    log = send_sms(
        serializer.validated_data['phone'],
        serializer.validated_data['message'],
        kind='manual',
    )
    if log.status != 'sent':
        return Response(
            {'error': log.error or 'ارسال ناموفق بود.', 'log': SmsLogSerializer(log).data},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return Response({'message': 'پیامک ارسال شد.', 'log': SmsLogSerializer(log).data})


@extend_schema(responses={200: inline_serializer('AdminSmsStats', {
    'sent': serializers.IntegerField(),
    'failed': serializers.IntegerField(),
    'skipped': serializers.IntegerField(),
    'total': serializers.IntegerField(),
})})
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_sms_stats(request):
    counts = {row['status']: row['total'] for row in SmsLog.objects.values('status').annotate(total=Count('id'))}
    return Response({
        'sent': counts.get('sent', 0),
        'failed': counts.get('failed', 0),
        'skipped': counts.get('skipped', 0),
        'total': sum(counts.values()),
    })
