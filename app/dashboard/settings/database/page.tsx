import { Metadata } from "next";
import DatabaseSettingsClient from "./db-settings-client";

export const metadata: Metadata = {
  title: "数据库管理",
};

export default function DatabaseSettingsPage() {
  return <DatabaseSettingsClient />;
}
