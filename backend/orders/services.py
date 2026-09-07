from django.db import transaction

from .models import Cart, CartItem


@transaction.atomic
def merge_guest_cart(request, user):
    session_key = request.session.session_key
    if not session_key:
        return

    guest_cart = Cart.objects.select_for_update().filter(
        user__isnull=True,
        session_key=session_key,
    ).first()
    if not guest_cart:
        return

    user_cart, _ = Cart.objects.get_or_create(user=user)
    user_cart = Cart.objects.select_for_update().get(pk=user_cart.pk)

    guest_items = list(guest_cart.items.select_for_update().select_related('product', 'variant'))
    for guest_item in guest_items:
        product = guest_item.product
        variant = guest_item.variant
        if product.status != 'active' or (variant and not variant.is_active):
            guest_item.delete()
            continue

        available_stock = variant.stock if variant else product.stock
        if available_stock <= 0:
            guest_item.delete()
            continue

        existing = CartItem.objects.select_for_update().filter(
            cart=user_cart,
            product=product,
            variant=variant,
        ).first()
        merged_quantity = min(
            available_stock,
            guest_item.quantity + (existing.quantity if existing else 0),
        )

        if existing:
            existing.quantity = merged_quantity
            existing.save(update_fields=['quantity'])
            guest_item.delete()
        else:
            guest_item.cart = user_cart
            guest_item.quantity = merged_quantity
            guest_item.save(update_fields=['cart', 'quantity'])

    guest_cart.delete()
