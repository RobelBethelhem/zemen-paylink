"use client";

import { s } from "@/lib/css";
import { AppProvider, useApp } from "@/store/AppProvider";
import { SessionProvider } from "@/store/SessionProvider";
import { Screens } from "@/components/Screens";
import { Shell } from "@/components/Shell";
import { Activate } from "@/components/screens/Activate";
import { ConnectGateway } from "@/components/screens/ConnectGateway";
import { ForgotPassword } from "@/components/screens/ForgotPassword";
import { Login } from "@/components/screens/Login";
import { SecurityQuestions } from "@/components/screens/SecurityQuestions";
import { MerchantRegister } from "@/components/screens/MerchantRegister";
import { Register } from "@/components/screens/Register";
import { Otp } from "@/components/screens/Otp";
import { Pay } from "@/components/screens/Pay";

function App() {
  const { isLogin, isActivate, isOtp, isDashboard, isPay, isConnectGateway, isRegister, isMerchantRegister, isForgotPassword, isSecurityQuestions } =
    useApp();

  return (
    <div style={s("min-height:100vh;position:relative")}>
      {isLogin && <Login />}
      {isRegister && <Register />}
      {isForgotPassword && <ForgotPassword />}
      {isSecurityQuestions && <SecurityQuestions />}
      {isMerchantRegister && <MerchantRegister />}
      {isActivate && <Activate />}
      {isOtp && <Otp />}
      {isConnectGateway && <ConnectGateway />}
      <div data-anchor="full" />
      {isDashboard && (
        <Shell>
          <Screens />
        </Shell>
      )}
      {isPay && <Pay />}
    </div>
  );
}

export default function Page() {
  return (
    <SessionProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </SessionProvider>
  );
}
