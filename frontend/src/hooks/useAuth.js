import { useContext } from 'react';
import AuthContext from '../contexts/AuthContextValue';

export function useAuth() {
  return useContext(AuthContext);
}
