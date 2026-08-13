import { redirect } from "next/navigation";

// The catalog moved onto the homepage; deep links to the old catalog URL land
// there. Provider, source, and skill detail pages below /marketplace/ remain.
export default function CatalogRedirect() {
  redirect("/");
}
