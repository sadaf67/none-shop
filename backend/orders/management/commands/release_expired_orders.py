from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from orders.models import Order


class Command(BaseCommand):
    help = 'Cancel unpaid expired orders and release their reserved inventory.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=settings.ORDER_RESERVATION_MINUTES)
        payment_cutoff = timezone.now() - timedelta(minutes=settings.PAYMENT_RESERVATION_MINUTES)
        order_ids = list(
            Order.objects.filter(status='pending', created_at__lt=cutoff)
            .filter(
                Q(payment__isnull=True)
                | Q(payment__status='failed')
                | Q(payment__status='pending', payment__updated_at__lt=payment_cutoff)
            )
            .values_list('id', flat=True)
        )

        released = 0
        for order_id in order_ids:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order_id)
                if order.status != 'pending':
                    continue
                order.status = 'cancelled'
                order.save(update_fields=['status', 'updated_at'])
                if order.release_inventory():
                    released += 1

        self.stdout.write(self.style.SUCCESS(f'Cancelled {len(order_ids)} expired orders; released {released} reservations.'))
