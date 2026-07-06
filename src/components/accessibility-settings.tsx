import { Card, CardContent } from "@/components/ui/card";
import { useAccessibility, type TextScale } from "@/lib/accessibility/accessibility-context";
import { useTranslation } from "@/lib/i18n/i18n-context";

const SCALES: { value: TextScale; labelKey: string }[] = [
  { value: 1, labelKey: "a11y.textSizeStandard" },
  { value: 1.25, labelKey: "a11y.textSizeLarge" },
  { value: 1.5, labelKey: "a11y.textSizeLarger" },
  { value: 2, labelKey: "a11y.textSizeLargest" },
];

export function AccessibilitySettings() {
  const { t } = useTranslation();
  const a11y = useAccessibility();

  return (
    <>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {t("a11y.heading")}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">{t("a11y.subtitle")}</p>

      {/* High contrast */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <label className="flex items-start gap-3 cursor-pointer" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              className="accent-primary size-4 mt-1"
              checked={a11y.high_contrast_enabled}
              onChange={(e) => a11y.update({ high_contrast_enabled: e.target.checked })}
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{t("a11y.highContrast")}</span>
              <p className="text-xs text-muted-foreground">{t("a11y.highContrastDesc")}</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Text size */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm">{t("a11y.textSize")}</h3>
            <p className="text-xs text-muted-foreground">{t("a11y.textSizeDesc")}</p>
          </div>
          <div role="radiogroup" aria-label={t("a11y.textSize")} className="space-y-2">
            {SCALES.map(({ value, labelKey }) => (
              <label
                key={value}
                className="flex items-center gap-3 cursor-pointer"
                style={{ minHeight: 44 }}
              >
                <input
                  type="radio"
                  name="text-scale"
                  value={value}
                  checked={a11y.text_scale_factor === value}
                  onChange={() => a11y.update({ text_scale_factor: value })}
                  className="accent-primary size-4"
                />
                <span className="text-sm">{t(labelKey)}</span>
              </label>
            ))}
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("a11y.preview")}</p>
            <p className="text-sm">{t("a11y.previewText")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reduce motion */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <label className="flex items-start gap-3 cursor-pointer" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              className="accent-primary size-4 mt-1"
              checked={a11y.reduce_motion_enabled}
              onChange={(e) => a11y.update({ reduce_motion_enabled: e.target.checked })}
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{t("a11y.reduceMotion")}</span>
              <p className="text-xs text-muted-foreground">{t("a11y.reduceMotionDesc")}</p>
            </div>
          </label>
        </CardContent>
      </Card>
    </>
  );
}