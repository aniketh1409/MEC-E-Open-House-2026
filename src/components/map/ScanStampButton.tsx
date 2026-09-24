import { Button } from "@mantine/core";
import { IconScan } from "@tabler/icons-react";
import { Link } from "react-router-dom";

/** Opens the scanner; after collecting, the visitor comes straight back to the map. */
export function ScanStampButton({ floating = false }: { floating?: boolean }) {
  return (
    <Button
      component={Link}
      to="/passport/scan?from=map"
      className={floating ? "map-fab scan-fab" : undefined}
      color="ualbertaGold.5"
      c="ualbertaGreen.9"
      radius={floating ? "xl" : undefined}
      leftSection={<IconScan size={18} stroke={2} />}
    >
      Scan stamp
    </Button>
  );
}
