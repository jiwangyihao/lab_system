import { Metadata } from "next";
import ProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "个人信息",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
