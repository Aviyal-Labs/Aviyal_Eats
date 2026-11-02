from rest_framework import serializers

from restaurants.models import Restaurant


class RestaurantApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "slug",
            "status",
            "rejection_reason",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RestaurantRejectionSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=2000,
    )


class AdminRestaurantListSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(
        source="owner.email",
        read_only=True,
    )

    owner_name = serializers.CharField(
        source="owner.full_name",
        read_only=True,
    )

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "slug",
            "phone",
            "city",
            "status",
            "rejection_reason",
            "owner_email",
            "owner_name",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


from .models import ApprovalAuditLog


class ApprovalAuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(
        source="actor.email",
        read_only=True,
    )

    class Meta:
        model = ApprovalAuditLog
        fields = [
            "id",
            "action",
            "previous_status",
            "new_status",
            "reason",
            "actor_email",
            "created_at",
        ]
        read_only_fields = fields
