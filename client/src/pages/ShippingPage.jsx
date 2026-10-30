import React from "react";
import { Truck } from "lucide-react";
import { PolicyPage } from "../components/common/PolicyPage";

// Text for this page is edited in Admin → Content Pages and served by the API
export const ShippingPage = () => <PolicyPage slug="shipping" icon={Truck} fallbackTitle="Shipping & Delivery Policy" />;
