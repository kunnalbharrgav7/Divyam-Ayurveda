import React from "react";
import { RotateCcw } from "lucide-react";
import { PolicyPage } from "../components/common/PolicyPage";

// Text for this page is edited in Admin → Content Pages and served by the API
export const ReturnsPage = () => <PolicyPage slug="returns" icon={RotateCcw} fallbackTitle="Returns & Refund Policy" />;
