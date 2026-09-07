from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal

from products.models import Category, Product

from .models import User


class PasswordPolicyTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration_rejects_common_password(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'new-user',
                'email': 'new@example.test',
                'password': 'password123',
                'password2': 'password123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='new-user').exists())

    def test_admin_creation_uses_django_password_validators(self):
        admin = User.objects.create_superuser(
            username='root-admin',
            email='root@example.test',
            password='Strong-Root-Pass-419!',
        )
        self.client.force_authenticate(admin)
        response = self.client.post(
            '/api/auth/admins/create/',
            {'username': 'weak-admin', 'password': '123456'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='weak-admin').exists())

    def test_guest_cart_is_merged_after_login(self):
        user = User.objects.create_user(username='buyer', password='Strong-Buyer-Pass-419!')
        category = Category.objects.create(name='روزمره', slug='daily')
        product = Product.objects.create(
            name='کفش بدون تنوع',
            slug='plain-shoe',
            sku='PLAIN-SHOE',
            category=category,
            description='محصول تست',
            price=Decimal('100000'),
            stock=3,
            status='active',
        )
        added = self.client.post(
            '/api/orders/cart/add/',
            {'product_id': str(product.id), 'quantity': 2},
            format='json',
        )
        self.assertEqual(added.status_code, 201)

        logged_in = self.client.post(
            '/api/auth/login/',
            {'username': user.username, 'password': 'Strong-Buyer-Pass-419!'},
            format='json',
        )
        self.assertEqual(logged_in.status_code, 200, logged_in.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {logged_in.data['tokens']['access']}")
        cart = self.client.get('/api/orders/cart/')
        self.assertEqual(cart.status_code, 200)
        self.assertEqual(cart.data['items_count'], 2)
