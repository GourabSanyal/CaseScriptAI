import { AppHeader } from '@/components/app-header';

type ModelDownloadHeaderProps = {
  horizontalPad: number;
};

export function ModelDownloadHeader({ horizontalPad }: ModelDownloadHeaderProps) {
  return <AppHeader horizontalPad={horizontalPad} rightIcon="cloud-download" />;
}
