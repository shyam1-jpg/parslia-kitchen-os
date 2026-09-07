import Guard from "@/components/Guard";
import Guests from "@/components/Guests";
export default function Page() { return <Guard perm="guest.read"><Guests /></Guard>; }
