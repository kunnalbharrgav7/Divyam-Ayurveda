import React from "react";
import { Scale } from "lucide-react";
import { PolicyPage } from "../components/common/PolicyPage";

// Text for this page is edited in Admin → Content Pages and served by the API
export const TermsPage = () => <PolicyPage slug="terms" icon={Scale} fallbackTitle="Terms & Conditions" />;
