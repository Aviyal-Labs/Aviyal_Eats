import { RouterProvider } from 'react-router-dom';
import { router } from './routerConfig';

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
