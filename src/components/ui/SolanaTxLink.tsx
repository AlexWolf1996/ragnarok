'use client';

import { ExternalLink } from 'lucide-react';
import { getSolanaExplorerUrl } from '@/lib/solana/matchHash';

interface SolanaTxLinkProps {
  txHash: string;
  network?: 'devnet' | 'mainnet-beta';
  showIcon?: boolean;
  className?: string;
}

export default function SolanaTxLink({
  txHash,
  network = 'devnet',
  showIcon = true,
  className = '',
}: SolanaTxLinkProps) {
  const url = getSolanaExplorerUrl(txHash, network);
  const shortHash = `${txHash.slice(0, 8)}...${txHash.slice(-8)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[#666670] hover:text-[#e8e8e8] text-xs font-mono flex items-center gap-1 transition-colors ${className}`}
      title={`View transaction ${txHash} on Solana Explorer`}
    >
      <span>{shortHash}</span>
      {showIcon && <ExternalLink size={12} />}
    </a>
  );
}

interface SolanaVerifiedBadgeProps {
  txHash: string;
  network?: 'devnet' | 'mainnet-beta';
}

export function SolanaVerifiedBadge({ txHash, network = 'devnet' }: SolanaVerifiedBadgeProps) {
  const url = getSolanaExplorerUrl(txHash, network);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 bg-[#111118] border border-[#1a1a25] rounded text-[10px] font-mono text-[#666670] hover:text-[#e8e8e8] hover:border-[#333340] transition-colors"
      title="Verified on Solana"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 101 88"
        fill="currentColor"
        className="flex-shrink-0"
      >
        <path d="M100.48 69.3817L83.8068 86.8015C83.4444 87.1799 83.0058 87.4816 82.5185 87.6878C82.0312 87.894 81.5055 88.0003 80.9743 88H1.93563C1.55849 88 1.18957 87.8926 0.874202 87.6912C0.558829 87.4897 0.310607 87.2029 0.158843 86.8659C0.00707908 86.5289 -0.0421717 86.1566 0.0158625 85.7945C0.0738967 85.4324 0.236832 85.0964 0.485088 84.8306L17.1584 67.4108C17.5209 67.0324 17.9598 66.7308 18.4474 66.5765C18.9349 66.4223 19.4607 66.316 19.9919 66.316H98.9306C99.3077 66.316 99.6766 66.4234 99.992 66.6249C100.307 66.8263 100.555 67.1131 100.707 67.4502C100.859 67.7872 100.908 68.1594 100.85 68.5216C100.792 68.8837 100.629 69.2196 100.381 69.4855L100.48 69.3817Z" />
        <path d="M83.8068 0.198464C83.4444 -0.179859 83.0058 -0.481556 82.5185 -0.687746C82.0312 -0.893935 81.5055 -1.00026 80.9743 -1H1.93563C1.55849 -1 1.18957 -0.892623 0.874202 -0.691178C0.558829 -0.489733 0.310607 -0.202927 0.158843 0.134152C0.00707908 0.47123 -0.0421717 0.843531 0.0158625 1.20565C0.0738967 1.56777 0.236832 1.90375 0.485088 2.16956L17.1584 19.5765C17.5209 19.9549 17.9598 20.2566 18.4474 20.4628C18.9349 20.669 19.4607 20.7753 19.9919 20.7753H98.9306C99.3077 20.7753 99.6766 20.6679 99.992 20.4664C100.307 20.265 100.555 19.9782 100.707 19.6411C100.859 19.3041 100.908 18.9318 100.85 18.5696C100.792 18.2075 100.629 17.8715 100.381 17.6057L83.8068 0.198464Z" />
        <path d="M17.1584 35.2273C17.5209 34.8489 17.9598 34.5472 18.4474 34.341C18.9349 34.1348 19.4607 34.0285 19.9919 34.0285H98.9306C99.3077 34.0285 99.6766 34.1359 99.992 34.3374C100.307 34.5388 100.555 34.8256 100.707 35.1626C100.859 35.4997 100.908 35.8719 100.85 36.2341C100.792 36.5962 100.629 36.9322 100.381 37.198L83.8068 54.6049C83.4444 54.9833 83.0058 55.285 82.5185 55.4912C82.0312 55.6974 81.5055 55.8037 80.9743 55.8037H1.93563C1.55849 55.8037 1.18957 55.6963 0.874202 55.4949C0.558829 55.2934 0.310607 55.0066 0.158843 54.6696C0.00707908 54.3325 -0.0421717 53.9602 0.0158625 53.5981C0.0738967 53.236 0.236832 52.9 0.485088 52.6342L17.1584 35.2273Z" />
      </svg>
      <span>ON-CHAIN</span>
      <ExternalLink size={10} />
    </a>
  );
}
