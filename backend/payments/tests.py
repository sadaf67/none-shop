from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from orders.models import Order
from products.models import Category, Product
from users.models import User

from .models import Payment


def gateway_response(payload):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload
    return response


@override_settings(
    ZARINPAL_MERCHANT_ID='00000000-0000-0000-0000-000000000000',
    ZARINPAL_SANDBOX=True,
    FRONTEND_URL='https://shop.example.test',
)
class PaymentWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='payer', password='Strong-Test-Pass-419!')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        category = Category.objects.create(name='تست', slug='test')
        self.product = Product.objects.create(
            name='کفش پرداخت',
            slug='payment-shoe',
            sku='PAY-SHOE',
            category=category,
            description='محصول تست پرداخت',
            price=Decimal('200000'),
            stock=4,
            status='active',
        )
        self.order = Order.objects.create(
            user=self.user,
            receiver_name='پرداخت‌کننده',
            receiver_phone='09120000000',
            province='تهران',
            city='تهران',
            street='نشانی تست',
            postal_code='1234567890',
            subtotal=Decimal('200000'),
            shipping_cost=Decimal('30000'),
            total=Decimal('230000'),
            inventory_reserved=True,
        )
        self.order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_sku=self.product.sku,
            unit_price=self.product.price,
            quantity=1,
        )

    @patch('payments.views.requests.post')
    def test_repeated_payment_request_reuses_authority(self, mocked_post):
        mocked_post.return_value = gateway_response({
            'data': {'code': 100, 'authority': 'A000000000000000000000000000001'},
            'errors': [],
        })

        first = self.client.post(f'/api/payments/{self.order.id}/request/', format='json')
        second = self.client.post(f'/api/payments/{self.order.id}/request/', format='json')

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(first.data['authority'], second.data['authority'])
        self.assertEqual(mocked_post.call_count, 1)

    @patch('payments.views.requests.post')
    def test_public_verify_is_idempotent_and_updates_order_once(self, mocked_post):
        authority = 'A000000000000000000000000000002'
        payment = Payment.objects.create(
            order=self.order,
            user=self.user,
            amount=self.order.total,
            authority=authority,
        )
        mocked_post.return_value = gateway_response({
            'data': {'code': 100, 'ref_id': 123456789},
            'errors': [],
        })
        anonymous = APIClient()

        first = anonymous.post(
            '/api/payments/verify/',
            {'authority': authority, 'status': 'OK'},
            format='json',
        )
        second = anonymous.post(
            '/api/payments/verify/',
            {'authority': authority, 'status': 'OK'},
            format='json',
        )

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.order.refresh_from_db()
        payment.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, 'paid')
        self.assertEqual(payment.status, 'success')
        self.assertEqual(payment.ref_id, '123456789')
        self.assertEqual(self.product.sold_count, 1)
        self.assertEqual(mocked_post.call_count, 1)

    @override_settings(ZARINPAL_MERCHANT_ID='')
    def test_unconfigured_gateway_is_unavailable(self):
        response = self.client.post(f'/api/payments/{self.order.id}/request/', format='json')
        self.assertEqual(response.status_code, 503)
