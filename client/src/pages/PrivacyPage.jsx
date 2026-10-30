import React from "react";
import { Lock } from "lucide-react";
import { PolicyPage } from "../components/common/PolicyPage";

// Text for this page is edited in Admin → Content Pages and served by the API
export const PrivacyPage = () => <PolicyPage slug="privacy" icon={Lock} fallbackTitle="Privacy Policy" />;
