from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Payment
        fields = ('id', 'order', 'amount', 'status', 'status_display',
                  'gateway', 'ref_id', 'created_at')
