from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import Review


class AdminReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    user_label = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'product', 'product_name', 'product_slug', 'user', 'user_label',
                  'rating', 'title', 'body', 'pros', 'cons', 'is_approved',
                  'is_verified_purchase', 'helpful_count', 'created_at')
        read_only_fields = ('product', 'user', 'rating', 'title', 'body', 'pros', 'cons',
                            'helpful_count', 'created_at')


class AdminReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('product', 'user').order_by('-created_at')
    serializer_class = AdminReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    filterset_fields = ['is_approved', 'rating', 'product']
    search_fields = ['body', 'title', 'product__name']

    @extend_schema(
        request=inline_serializer('AdminReviewBulkApprove', {
            'ids': serializers.ListField(child=serializers.IntegerField()),
            'approve': serializers.BooleanField(required=False, default=True),
        }),
        responses={200: inline_serializer('AdminReviewBulkApproveResult', {
            'updated': serializers.IntegerField(),
        })},
    )
    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        ids = request.data.get('ids') or []
        approve = bool(request.data.get('approve', True))
        if not isinstance(ids, list):
            return Response({'error': 'ورودی نامعتبر است.'}, status=400)
        updated = Review.objects.filter(pk__in=ids).update(is_approved=approve)
        return Response({'updated': updated})


@extend_schema(responses={200: inline_serializer('AdminReviewStats', {
    'total': serializers.IntegerField(),
    'approved': serializers.IntegerField(),
    'pending': serializers.IntegerField(),
})})
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_review_stats(request):
    stats = Review.objects.aggregate(
        total=Count('id'),
        approved=Count('id', filter=Q(is_approved=True)),
        pending=Count('id', filter=Q(is_approved=False)),
    )
    return Response(stats)
