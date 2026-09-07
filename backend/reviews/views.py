from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Review, ReviewHelpful
from .serializers import ReviewSerializer


class ProductReviewsView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    # فقط برای تشخیص مدل توسط تولیدکنندهٔ اسکیما؛ در زمان اجرا get_queryset حاکم است.
    queryset = Review.objects.none()

    def get_queryset(self):
        return Review.objects.filter(
            product__slug=self.kwargs['product_slug'],
            is_approved=True
        ).select_related('user')


class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]


@extend_schema(
    request=None,
    responses={200: inline_serializer('ReviewHelpfulResult', {'message': serializers.CharField()})},
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_helpful(request, review_id):
    review = get_object_or_404(Review, id=review_id)
    _, created = ReviewHelpful.objects.get_or_create(review=review, user=request.user)
    if created:
        Review.objects.filter(pk=review_id).update(helpful_count=review.helpful_count + 1)
        return Response({'message': 'ثبت شد'})
    return Response({'message': 'قبلاً ثبت کرده‌اید'}, status=400)
