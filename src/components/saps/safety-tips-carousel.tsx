import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, ShieldCheck } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { getSafetyTips } from "@/lib/dashboard/dashboard.functions";
import { useAccessibility } from "@/lib/accessibility/accessibility-context";

const FALLBACK_TIPS = [
  {
    id: "fallback-1",
    title: "Never approach a wanted suspect",
    body_content:
      "Keep a safe distance, do not confront anyone, and report what you saw from a safe place.",
  },
  {
    id: "fallback-2",
    title: "Report sightings the same day",
    body_content:
      "Fresh information is far more useful to investigators. Include the time and a nearby landmark.",
  },
  {
    id: "fallback-3",
    title: "Protect your identity",
    body_content:
      "Your reports are anonymous. Avoid sharing your name, address, or phone number in messages.",
  },
  {
    id: "fallback-4",
    title: "Save the emergency number",
    body_content: "Call 10111 for emergencies in progress. Use this app for tips and sightings.",
  },
];

export function SafetyTipsCarousel() {
  const tipsFn = useServerFn(getSafetyTips);
  const { reduce_motion_enabled } = useAccessibility();
  const [api, setApi] = useState<CarouselApi>();

  const { data } = useQuery({
    queryKey: ["safety-tips"],
    queryFn: () => tipsFn(),
    staleTime: 10 * 60 * 1000,
  });

  const tips = data && data.length > 0 ? data : FALLBACK_TIPS;

  // Auto-slide, disabled entirely when the user prefers reduced motion.
  useEffect(() => {
    if (!api || reduce_motion_enabled) return;
    const id = setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 7000);
    return () => clearInterval(id);
  }, [api, reduce_motion_enabled]);

  return (
    <section aria-labelledby="safety-tips-heading" className="space-y-3">
      <h2 id="safety-tips-heading" className="flex items-center gap-2 text-xl font-semibold">
        <ShieldCheck className="size-5 text-accent-foreground" aria-hidden="true" /> Safety tips
      </h2>
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start", duration: reduce_motion_enabled ? 0 : 25 }}
        className="w-full"
      >
        <CarouselContent>
          {tips.map((tip) => (
            <CarouselItem key={tip.id} className="sm:basis-1/2 lg:basis-1/3">
              <Card className="h-full border-l-4 border-l-accent">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <Lightbulb className="size-5 text-accent-foreground" aria-hidden="true" />
                  <h3 className="font-semibold leading-snug text-primary">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.body_content}</p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="min-h-11 min-w-11" aria-label="Previous safety tip" />
        <CarouselNext className="min-h-11 min-w-11" aria-label="Next safety tip" />
      </Carousel>
    </section>
  );
}