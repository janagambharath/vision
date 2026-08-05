/**
 * Local-launch delivery and home-trial policy.
 *
 * Keep this deliberately small. A valid Indian pincode is not evidence that a
 * two-person Hyderabad team can deliver or run a home trial there. Operations
 * owns the configured list and expands it only after route capacity is proven.
 */
import { LOCAL_DELIVERY_PROMISE, LOCAL_HOME_TRIAL_PROMISE, LOCAL_SERVICE_AREA_LABEL } from "@/lib/local-service-public";

export { LOCAL_DELIVERY_PROMISE, LOCAL_HOME_TRIAL_PROMISE, LOCAL_SERVICE_AREA_LABEL };

const DEFAULT_HYDERABAD_PINCODES = [
  "500001", "500002", "500003", "500004", "500005", "500006", "500007", "500008",
  "500009", "500010", "500011", "500012", "500013", "500014", "500015", "500016",
  "500017", "500018", "500019", "500020", "500022", "500023", "500024", "500025",
  "500026", "500027", "500028", "500029", "500030", "500031", "500032", "500033",
  "500034", "500035", "500036", "500037", "500038", "500039", "500040", "500041",
  "500042", "500043", "500044", "500045", "500046", "500047", "500048", "500049",
  "500050", "500051", "500052", "500053", "500054", "500055", "500056", "500057",
  "500058", "500059", "500060", "500061", "500062", "500063", "500064", "500065",
  "500066", "500067", "500068", "500069", "500070", "500072", "500073", "500074",
  "500075", "500076", "500077", "500078", "500079", "500080", "500081", "500082",
  "500083", "500084", "500085", "500086", "500087", "500088", "500089", "500090",
  "500091", "500092", "500093", "500094", "500095", "500096", "500097", "500098",
  "500099", "500100", "500101", "500102", "500107", "500108", "500109", "500110",
  "500111", "500112", "500113", "500114", "500115", "500116", "500117", "500118",
  "500119", "501505"
];

function configuredPincodes() {
  const configured = process.env.HYDERABAD_SERVICEABLE_PINCODES
    ?.split(",")
    .map((pincode) => pincode.trim())
    .filter((pincode) => /^\d{6}$/.test(pincode));

  return new Set(configured?.length ? configured : DEFAULT_HYDERABAD_PINCODES);
}

export function isLocalLaunchPincode(pincode: string | null | undefined) {
  return Boolean(pincode && configuredPincodes().has(pincode.trim()));
}

export function getLocalServiceability(pincode: string | null | undefined) {
  const normalized = pincode?.trim() ?? "";
  if (!/^\d{6}$/.test(normalized)) {
    return {
      serviceable: false,
      message: "Enter a valid 6-digit Hyderabad pincode."
    };
  }

  if (!isLocalLaunchPincode(normalized)) {
    return {
      serviceable: false,
      message: `We currently serve select Hyderabad neighbourhoods: ${LOCAL_SERVICE_AREA_LABEL}.`
    };
  }

  return {
    serviceable: true,
    message: `Local delivery is available. Estimated delivery: ${LOCAL_DELIVERY_PROMISE}.`
  };
}
