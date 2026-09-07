from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'product', 'user_name', 'user_avatar', 'rating',
                  'title', 'body', 'pros', 'cons', 'is_verified_purchase',
                  'helpful_count', 'created_at')
        read_only_fields = ('id', 'user_name', 'user_avatar', 'is_verified_purchase',
                            'helpful_count', 'created_at')

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        # Check verified purchase
        from orders.models import Order
        validated_data['is_verified_purchase'] = Order.objects.filter(
            user=user, status='delivered',
            items__product=validated_data['product']
        ).exists()
        return super().create(validated_data)
