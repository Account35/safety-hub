import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { BackButton } from "@/components/saps/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/registry";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/language")({
  head: () => ({ meta: [{ title: "Language · Community Safety Tracker" }] }),
  component: LanguagePage,
});

function LanguagePage() {
  const { language, setLanguage, t } = useTranslation();

  async function pick(code: LanguageCode) {
    await setLanguage(code);
    toast.success(t("language.switched"));
  }

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-6">
        <BackButton label={t("common.back")} />
        <h1 className="text-xl font-bold text-primary">{t("language.pageTitle")}</h1>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{t("language.subtitle")}</p>

      <Card>
        <CardContent className="p-2">
          <ul className="divide-y divide-border" role="radiogroup" aria-label={t("language.heading")}>
            {LANGUAGES.filter((l) => l.is_active).map((lang) => {
              const active = lang.code === language;
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pick(lang.code)}
                    className="w-full flex items-center gap-3 px-3 py-4 text-left hover:bg-muted/50 focus-visible:outline-2 rounded-md"
                    style={{ minHeight: 56 }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{lang.name_native}</div>
                      {lang.name_native !== lang.name_english && (
                        <div className="text-xs text-muted-foreground">{lang.name_english}</div>
                      )}
                    </div>
                    {active && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                        <Check className="size-4" aria-hidden="true" />
                        {t("language.current")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}