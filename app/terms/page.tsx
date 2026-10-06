import TermsContent from "@/components/legal/terms-content";
import BackLink from "@/components/back-link";

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-6 pb-20 pt-10">
      <TermsContent />
      <BackLink />
    </div>
  );
}
