from django.urls import path

from . import views

urlpatterns = [
    path('feeds/torob.xml', views.torob_feed, name='torob-feed'),
    path('feeds/emalls.xml', views.emalls_feed, name='emalls-feed'),
    path('feeds/google.xml', views.google_merchant_feed, name='google-merchant-feed'),
    path('feeds/products.json', views.products_feed_json, name='products-feed-json'),
    path('sitemap.xml', views.sitemap_xml, name='sitemap'),
    path('robots.txt', views.robots_txt, name='robots'),
]
