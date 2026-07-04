export const CAMPAIGN_TYPES = ["safety_tip", "missing_person_alert", "wanted_person_alert", "general_announcement"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sent", "cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_AUDIENCES = ["all_users", "registered_only"] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

export function isAlertCampaign(t: CampaignType): boolean {
  return t === "missing_person_alert" || t === "wanted_person_alert";
}