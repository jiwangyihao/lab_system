import { Metadata } from "next";
import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "注册",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
