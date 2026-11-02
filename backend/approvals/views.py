from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from restaurants.models import Restaurant

from .permissions import IsSuperAdmin
from .serializers import (
    RestaurantApprovalSerializer,
    RestaurantRejectionSerializer,
)
from .services import approve_restaurant, reject_restaurant
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .pagination import RestaurantAdminPagination
from .serializers import AdminRestaurantListSerializer, ApprovalAuditLogSerializer

class RestaurantApproveView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, restaurant_id):
        get_object_or_404(Restaurant, pk=restaurant_id)

        restaurant = approve_restaurant(
            restaurant_id=restaurant_id,
            actor=request.user,
        )

        return Response(
            {
                "success": True,
                "message": "Restaurant approved successfully.",
                "data": RestaurantApprovalSerializer(restaurant).data,
            },
            status=status.HTTP_200_OK,
        )


class RestaurantRejectView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, restaurant_id):
        serializer = RestaurantRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        get_object_or_404(Restaurant, pk=restaurant_id)

        restaurant = reject_restaurant(
            restaurant_id=restaurant_id,
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )

        return Response(
            {
                "success": True,
                "message": "Restaurant rejected successfully.",
                "data": RestaurantApprovalSerializer(restaurant).data,
            },
            status=status.HTTP_200_OK,
        )


# -----------------------------------------
#        RESTAURANT LIST
# ----------------------------------------
class AdminRestaurantListView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        status_filter = request.query_params.get("status", "").strip().upper()

        search = request.query_params.get("search", "").strip()

        if status_filter and status_filter not in (
            Restaurant.Status.PENDING,
            Restaurant.Status.APPROVED,
            Restaurant.Status.REJECTED,
        ):
            raise ValidationError({"status": ["Invalid restaurant status."]})

        queryset = Restaurant.objects.select_related(
            "owner",
            "approved_by",
        ).order_by("-created_at", "-id")

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(city__icontains=search)
                | Q(slug__icontains=search)
                | Q(owner__email__icontains=search)
                | Q(owner__full_name__icontains=search)
            )

        paginator = RestaurantAdminPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        serializer = AdminRestaurantListSerializer(
            page,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Restaurants fetched successfully.",
                "data": {
                    "count": paginator.page.paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                    "results": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )




# -----------------------------------------
#        RESTAURANT DETAIL VIEW
# ----------------------------------------
class AdminRestaurantDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, restaurant_id):
        restaurant = get_object_or_404(
            Restaurant.objects.select_related(
                "owner",
                "approved_by",
            ),
            pk=restaurant_id,
        )

        history = restaurant.approval_history.select_related("actor").order_by(
            "-created_at", "-id"
        )

        return Response(
            {
                "success": True,
                "message": "Restaurant details fetched.",
                "data": {
                    "restaurant": AdminRestaurantListSerializer(restaurant).data,
                    "approval_history": ApprovalAuditLogSerializer(
                        history,
                        many=True,
                    ).data,
                },
            },
            status=status.HTTP_200_OK,
        )
