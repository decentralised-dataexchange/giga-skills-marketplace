"use client";

// Material UI icons behind the icon names the app already uses (the lucide
// vocabulary), so call sites keep their Tailwind classes. The wrapper turns a
// `size-N` utility into inline sizing, which wins over Emotion's 1em default.
import type { ComponentProps, CSSProperties } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import Add from "@mui/icons-material/Add";
import AddCircleOutlineOutlined from "@mui/icons-material/AddCircleOutlineOutlined";
import Apartment from "@mui/icons-material/Apartment";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowCircleRightOutlined from "@mui/icons-material/ArrowCircleRightOutlined";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Autorenew from "@mui/icons-material/Autorenew";
import CallSplit from "@mui/icons-material/CallSplit";
import CheckMui from "@mui/icons-material/Check";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ChevronLeftMui from "@mui/icons-material/ChevronLeft";
import ChevronRightMui from "@mui/icons-material/ChevronRight";
import Close from "@mui/icons-material/Close";
import CodeMui from "@mui/icons-material/Code";
import ContentCopy from "@mui/icons-material/ContentCopy";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ErrorOutlined from "@mui/icons-material/ErrorOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import FormatBold from "@mui/icons-material/FormatBold";
import FormatItalic from "@mui/icons-material/FormatItalic";
import FormatListBulleted from "@mui/icons-material/FormatListBulleted";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyOutlined from "@mui/icons-material/KeyOutlined";
import LinkMui from "@mui/icons-material/Link";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ManageSearch from "@mui/icons-material/ManageSearch";
import MenuMui from "@mui/icons-material/Menu";
import OpenInNew from "@mui/icons-material/OpenInNew";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SearchMui from "@mui/icons-material/Search";
import SendOutlined from "@mui/icons-material/SendOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import ShowChart from "@mui/icons-material/ShowChart";
import StarMui from "@mui/icons-material/Star";
import Title from "@mui/icons-material/Title";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";

/** The `size-N` (and `size-[Npx]`) Tailwind utilities, as pixels. */
function sizeFromClassName(className?: string): number | undefined {
  if (!className) return undefined;
  const arbitrary = /(?:^|\s)size-\[(\d+(?:\.\d+)?)px\]/.exec(className);
  if (arbitrary) return Number(arbitrary[1]);
  const scale = /(?:^|\s)size-(\d+(?:\.\d+)?)(?:\s|$)/.exec(className);
  return scale ? Number(scale[1]) * 4 : undefined;
}

type IconProps = SvgIconProps & { strokeWidth?: number };

function wrap(Icon: React.ComponentType<SvgIconProps>) {
  return function WrappedIcon({ className, style, strokeWidth: _sw, ...props }: IconProps) {
    void _sw; // lucide-only prop; MUI icons have no stroke
    const px = sizeFromClassName(className);
    const sizing: CSSProperties = px ? { fontSize: px, width: px, height: px } : {};
    return <Icon {...props} className={className} style={{ ...sizing, ...style }} />;
  };
}

/** Icon component shape, for props that take an icon. */
export type LucideIcon = ReturnType<typeof wrap>;
export type IconComponentProps = ComponentProps<LucideIcon>;

export const Activity = wrap(ShowChart);
export const ArrowLeft = wrap(ArrowBack);
export const ArrowRight = wrap(ArrowForward);
export const BadgeCheck = wrap(VerifiedOutlined);
export const Bold = wrap(FormatBold);
export const Building2 = wrap(Apartment);
export const Check = wrap(CheckMui);
export const CheckIcon = wrap(CheckMui);
export const ChevronDown = wrap(KeyboardArrowDown);
export const ChevronDownIcon = wrap(KeyboardArrowDown);
export const ChevronLeft = wrap(ChevronLeftMui);
export const ChevronRight = wrap(ChevronRightMui);
export const ChevronRightIcon = wrap(ChevronRightMui);
export const ChevronUpIcon = wrap(KeyboardArrowUp);
export const CircleAlert = wrap(ErrorOutlined);
export const CircleArrowRight = wrap(ArrowCircleRightOutlined);
export const CircleCheck = wrap(CheckCircleOutlined);
export const Code = wrap(CodeMui);
export const Copy = wrap(ContentCopy);
export const ExternalLink = wrap(OpenInNew);
export const Eye = wrap(VisibilityOutlined);
export const GitFork = wrap(CallSplit);
export const Heading = wrap(Title);
export const Home = wrap(HomeOutlined);
export const Italic = wrap(FormatItalic);
export const KeyRound = wrap(KeyOutlined);
export const Link2 = wrap(LinkMui);
export const List = wrap(FormatListBulleted);
export const Loader2 = wrap(Autorenew);
export const LogOut = wrap(LogoutOutlined);
export const Menu = wrap(MenuMui);
export const Pencil = wrap(EditOutlined);
export const Plus = wrap(Add);
export const PlusCircle = wrap(AddCircleOutlineOutlined);
export const ScanSearch = wrap(ManageSearch);
export const ScrollText = wrap(ReceiptLongOutlined);
export const Search = wrap(SearchMui);
export const Send = wrap(SendOutlined);
export const Settings = wrap(SettingsOutlined);
export const Shield = wrap(ShieldOutlined);
export const Star = wrap(StarMui);
export const Upload = wrap(FileUploadOutlined);
export const Users = wrap(GroupOutlined);
export const X = wrap(Close);
export const XIcon = wrap(Close);
