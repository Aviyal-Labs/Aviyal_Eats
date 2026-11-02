from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import User
from .serializers import (
    OwnerRestaurantSerializer,
    RejectedRestaurantEditSerializer,
)
from .services import (
    update_rejected_restaurant,
    resubmit_rejected_restaurant,
)


class IsRestaurantOwner(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and request.user.role == User.Role.OWNER
        )


class OwnerRestaurantEditView(APIView):
    permission_classes = [IsRestaurantOwner]

    def patch(self, request):
        serializer = RejectedRestaurantEditSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        restaurant = update_rejected_restaurant(
            owner=request.user,
            validated_data=serializer.validated_data,
        )

        return Response(
            {
                "success": True,
                "message": "Restaurant details updated.",
                "data": OwnerRestaurantSerializer(restaurant).data,
            },
            status=status.HTTP_200_OK,
        )


class OwnerRestaurantResubmitView(APIView):
    permission_classes = [IsRestaurantOwner]

    def post(self, request):
        restaurant = resubmit_rejected_restaurant(
            owner=request.user,
        )

        return Response(
            {
                "success": True,
                "message": "Restaurant resubmitted for review.",
                "data": OwnerRestaurantSerializer(restaurant).data,
            },
            status=status.HTTP_200_OK,
        )
