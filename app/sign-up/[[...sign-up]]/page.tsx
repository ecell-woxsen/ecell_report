import { SignUp } from "@clerk/nextjs";
import { ECellLogo } from "@/components/ecell-logo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/30 via-bg-primary to-bg-primary p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <ECellLogo size={72} className="mx-auto mb-4 rounded-2xl shadow-sm" priority />
          <h1 className="text-2xl font-bold text-text-primary">Join E-Cell</h1>
          <p className="text-text-secondary mt-1">Create your account to get started</p>
        </div>
        <SignUp
          fallbackRedirectUrl="/onboarding"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg rounded-2xl border border-border-light",
              formButtonPrimary: "bg-brand hover:bg-brand-mid rounded-xl",
            },
          }}
        />
      </div>
    </div>
  );
}
