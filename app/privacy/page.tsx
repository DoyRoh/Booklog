import PrivacyContent from "@/components/legal/privacy-content";
import BackLink from "@/components/back-link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-6 pb-20 pt-10">
      <PrivacyContent />
      <BackLink />
    </div>
  );
}
