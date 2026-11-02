from django.urls import path

from .views import (
    OwnerRestaurantEditView,
    OwnerRestaurantResubmitView,
)

urlpatterns = [
    path(
        "restaurant/",
        OwnerRestaurantEditView.as_view(),
        name="owner-restaurant-edit",
    ),
    path(
        "restaurant/resubmit/",
        OwnerRestaurantResubmitView.as_view(),
        name="owner-restaurant-resubmit",
    ),
]
