from rest_framework import serializers

from .models import Restaurant


class RejectedRestaurantEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "name",
            "phone",
            "city",
        ]
        extra_kwargs = {
            "name": {"required": False},
            "phone": {"required": False},
            "city": {"required": False},
        }

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs


class OwnerRestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "phone",
            "city",
            "slug",
            "status",
            "rejection_reason",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
