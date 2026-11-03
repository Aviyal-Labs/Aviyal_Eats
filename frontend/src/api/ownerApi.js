import { apiClient } from './client.js';
import { endpoints } from './endpoints.js';

export const ownerApi = {
  async updateRestaurant({ name, phone, city }) {
    const { data } = await apiClient.patch(endpoints.owner.restaurant, { name, phone, city });
    return data.data;
  },
  async resubmit() {
    return (await apiClient.post(endpoints.owner.resubmit)).data.data;
  },
};