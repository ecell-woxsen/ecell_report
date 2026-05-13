import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/30 via-bg-primary to-bg-primary p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-brand-mid flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">EC</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome Back</h1>
          <p className="text-text-secondary mt-1">Sign in to E-Cell Reports</p>
        </div>
        <SignIn
          fallbackRedirectUrl="/dashboard"
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
