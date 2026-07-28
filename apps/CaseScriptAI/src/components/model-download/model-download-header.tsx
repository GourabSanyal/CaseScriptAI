import { AppHeader } from '@/components/app-header';

type ModelDownloadHeaderProps = {
  horizontalPad: number;
};

export function ModelDownloadHeader({ horizontalPad }: ModelDownloadHeaderProps) {
  // ponytail: onboarding has no nav yet — title only until drawer exists
  return <AppHeader horizontalPad={horizontalPad} showMenu={false} />;
}
