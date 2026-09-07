from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from discounts.models import Coupon, CouponUsage
from products.models import Category, Product, ProductVariant
from users.models import Address, User

from .models import Cart, CartItem, Order


class OrderWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='buyer', password='Strong-Test-Pass-419!')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.category = Category.objects.create(name='کفش روزمره', slug='daily')
        self.product = Product.objects.create(
            name='کفش تست',
            slug='test-shoe',
            sku='TEST-SHOE',
            category=self.category,
            description='محصول تست',
            price=Decimal('300000'),
            stock=0,
            status='active',
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            size='42',
            color='مشکی',
            sku='TEST-SHOE-42-BLK',
            stock=5,
        )
        self.address = Address.objects.create(
            user=self.user,
            title='خانه',
            receiver_name='خریدار تست',
            phone='09120000000',
            province='تهران',
            city='تهران',
            street='نشانی تست',
            postal_code='1234567890',
        )

    def test_variant_is_required_and_cart_quantity_cannot_exceed_stock(self):
        missing_variant = self.client.post(
            '/api/orders/cart/add/',
            {'product_id': str(self.product.id), 'quantity': 1},
            format='json',
        )
        self.assertEqual(missing_variant.status_code, 400)
        self.assertIn('variant_id', missing_variant.data)

        added = self.client.post(
            '/api/orders/cart/add/',
            {'product_id': str(self.product.id), 'variant_id': self.variant.id, 'quantity': 4},
            format='json',
        )
        self.assertEqual(added.status_code, 201)
        self.assertEqual(added.data['items'][0]['variant']['size'], '42')

        too_many = self.client.post(
            '/api/orders/cart/add/',
            {'product_id': str(self.product.id), 'variant_id': self.variant.id, 'quantity': 2},
            format='json',
        )
        self.assertEqual(too_many.status_code, 400)

    def test_create_order_reserves_stock_and_consumes_coupon(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product, variant=self.variant, quantity=2)
        coupon = Coupon.objects.create(
            code='SHOE10',
            discount_type='percent',
            value=10,
            min_order_amount=Decimal('100000'),
            usage_limit=10,
            per_user_limit=1,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=1),
        )
        coupon.categories.add(self.category)

        response = self.client.post(
            '/api/orders/create/',
            {'address_id': self.address.id, 'coupon_code': 'shoe10'},
            format='json',
        )

        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(pk=response.data['id'])
        self.variant.refresh_from_db()
        coupon.refresh_from_db()
        self.assertEqual(self.variant.stock, 3)
        self.assertTrue(order.inventory_reserved)
        self.assertFalse(order.inventory_released)
        self.assertEqual(order.subtotal, Decimal('600000'))
        self.assertEqual(order.discount_amount, Decimal('60000'))
        self.assertEqual(order.shipping_cost, Decimal('0'))
        self.assertEqual(order.total, Decimal('540000'))
        self.assertEqual(order.items.get().variant_label, 'سایز 42 · مشکی')
        self.assertEqual(coupon.used_count, 1)
        self.assertTrue(CouponUsage.objects.filter(coupon=coupon, user=self.user, order=order).exists())
        self.assertFalse(cart.items.exists())

    def test_create_order_rechecks_stock_and_rolls_back(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product, variant=self.variant, quantity=6)

        response = self.client.post(
            '/api/orders/create/',
            {'address_id': self.address.id},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)

    def test_cancelling_pending_order_releases_inventory_only_once(self):
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product, variant=self.variant, quantity=2)
        created = self.client.post(
            '/api/orders/create/',
            {'address_id': self.address.id},
            format='json',
        )
        order_id = created.data['id']

        cancelled = self.client.patch(
            f'/api/orders/admin/{order_id}/status/',
            {'status': 'cancelled'},
            format='json',
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)

        repeated = self.client.patch(
            f'/api/orders/admin/{order_id}/status/',
            {'status': 'cancelled'},
            format='json',
        )
        self.assertEqual(repeated.status_code, 409)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)

    def test_release_expired_orders_command(self):
        order = Order.objects.create(
            user=self.user,
            status='pending',
            receiver_name='خریدار تست',
            receiver_phone='09120000000',
            province='تهران',
            city='تهران',
            street='نشانی تست',
            postal_code='1234567890',
            subtotal=Decimal('300000'),
            total=Decimal('330000'),
            shipping_cost=Decimal('30000'),
            inventory_reserved=True,
        )
        order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_sku=self.product.sku,
            variant=self.variant,
            variant_label=self.variant.label,
            variant_sku=self.variant.sku,
            unit_price=self.product.price,
            quantity=1,
        )
        ProductVariant.objects.filter(pk=self.variant.pk).update(stock=4)
        Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(hours=2))

        call_command('release_expired_orders')

        order.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertTrue(order.inventory_released)
        self.assertEqual(self.variant.stock, 5)
