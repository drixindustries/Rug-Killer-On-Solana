import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Twitter, MessageCircle, Send } from "lucide-react";
import { SiDiscord, SiTelegram } from "react-icons/si";

interface SocialLinks {
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
}

interface SocialLinksCardProps {
  socialLinks?: SocialLinks;
  tokenAddress: string;
}

export function SocialLinksCard({ socialLinks, tokenAddress }: SocialLinksCardProps) {
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    return null;
  }

  const links = [
    socialLinks.website && {
      label: 'Website',
      url: socialLinks.website,
      icon: Globe,
      color: 'text-blue-500'
    },
    socialLinks.twitter && {
      label: 'Twitter',
      url: socialLinks.twitter,
      icon: Twitter,
      color: 'text-blue-400'
    },
    socialLinks.discord && {
      label: 'Discord',
      url: socialLinks.discord,
      icon: SiDiscord,
      color: 'text-indigo-400'
    },
    socialLinks.telegram && {
      label: 'Telegram',
      url: socialLinks.telegram,
      icon: SiTelegram,
      color: 'text-blue-500'
    }
  ].filter(Boolean) as Array<{ label: string; url: string; icon: any; color: string }>;

  if (links.length === 0) {
    return null;
  }

  return (
    <Card className="p-4" data-testid="card-social-links">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Social Links:</span>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.label}
                variant="outline"
                size="sm"
                asChild
                className="h-8"
                data-testid={`button-social-${link.label.toLowerCase()}`}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <Icon className={`h-3.5 w-3.5 ${link.color}`} />
                  <span className="text-xs">{link.label}</span>
                </a>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
