"use server"

interface OrderItem {
  name: string
  price: number
  quantity: number
}

interface CustomerInfo {
  name: string
  note: string
}

interface OrderConfirmationProps {
  customerInfo: CustomerInfo
  cart: OrderItem[]
  totalPrice: number
}

export async function sendOrderConfirmation({ customerInfo, cart, totalPrice }: OrderConfirmationProps) {
  try {
    // In a real application with email, you would send an email here
    // Since we're simplifying to just name and note, we'll just log the order

    console.log("Order received:")
    console.log("Customer:", customerInfo.name)
    console.log("Note:", customerInfo.note || "No special instructions")
    console.log("Items:", cart)
    console.log("Total:", totalPrice)

    // Simulate a delay like a real processing would have
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return { success: true }
  } catch (error) {
    console.error("Error in processing order:", error)
    throw new Error("Failed to process order")
  }
}
