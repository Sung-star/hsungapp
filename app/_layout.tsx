// app/_layout.tsx - EMERGENCY BYPASS VERSION
import { CartProvider } from '@/contexts/CartContext';
import { Slot } from 'expo-router';

export default function RootLayout() {
  return (
    <CartProvider>
      <Slot />
    </CartProvider>
  );
}