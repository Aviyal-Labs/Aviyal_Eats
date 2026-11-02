from django.urls import path

from .views import (
    RestaurantApproveView,
    RestaurantRejectView,
    AdminRestaurantListView,
    AdminRestaurantDetailView,
)

urlpatterns = [
    path(
        "restaurants/<uuid:restaurant_id>/approve/",
        RestaurantApproveView.as_view(),
        name="restaurant-approve",
    ),
    path(
        "restaurants/<uuid:restaurant_id>/reject/",
        RestaurantRejectView.as_view(),
        name="restaurant-reject",
    ),
    path(
        "restaurants/",
        AdminRestaurantListView.as_view(),
        name="admin-restaurant-list",
    ),
    path(
        "restaurants/<uuid:restaurant_id>/",
        AdminRestaurantDetailView.as_view(),
        name="admin-restaurant-detail",
    ),
]
