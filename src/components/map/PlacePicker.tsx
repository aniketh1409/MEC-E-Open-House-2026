import { CloseButton, Modal, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconCheck, IconChevronDown, IconSearch } from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";

export interface PlaceOption {
  value: string;
  label: string;
}

export interface PlaceGroup {
  group: string;
  items: PlaceOption[];
}

interface PlacePickerProps {
  label: string;
  placeholder: string;
  value?: string;
  groups: PlaceGroup[];
  onChange: (value: string) => void;
}

/**
 * Phone version of a place dropdown: a field that opens a full-screen, searchable list.
 * A floating dropdown inside the bottom sheet kept repositioning (flipping above and below the
 * field) as the keyboard opened and the sheet scrolled; a full-screen list has nothing to reposition.
 */
export function PlacePicker({ label, placeholder, value, groups, onChange }: PlacePickerProps) {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const labelId = useId();
  const selected = groups.flatMap((group) => group.items).find((item) => item.value === value);

  const matches = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => words.every((word) => `${item.label} ${group.group}`.toLocaleLowerCase().includes(word))),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const close = () => {
    setOpened(false);
    setQuery("");
  };

  return (
    <div className="place-picker">
      <Text component="span" id={labelId} className="place-picker-label">{label}</Text>
      <UnstyledButton
        className="place-picker-field"
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        data-empty={!selected || undefined}
        onClick={() => setOpened(true)}
      >
        <span className="place-picker-value">{selected?.label ?? placeholder}</span>
        <IconChevronDown size={16} aria-hidden="true" />
      </UnstyledButton>

      <Modal
        opened={opened}
        onClose={close}
        fullScreen
        withCloseButton={false}
        padding={0}
        transitionProps={{ transition: "slide-up", duration: 180 }}
        aria-labelledby={`${labelId}-title`}
        classNames={{ body: "place-picker-sheet" }}
      >
        <div className="place-picker-header">
          <Text id={`${labelId}-title`} fw={800} size="lg">{label}</Text>
          <CloseButton size="lg" aria-label="Close" onClick={close} />
        </div>
        <div className="place-picker-search">
          <TextInput
            aria-label={`Search ${label.toLocaleLowerCase()} places`}
            placeholder="Search buildings and places"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={18} />}
            size="md"
            radius="xl"
          />
        </div>
        <div className="place-picker-list" role="listbox" aria-label={label}>
          {matches.length === 0 && <Text c="dimmed" p="lg">No matching place.</Text>}
          {matches.map((group) => (
            <div key={group.group} role="group" aria-label={group.group}>
              <Text className="place-picker-group">{group.group}</Text>
              {group.items.map((item) => (
                <UnstyledButton
                  key={item.value}
                  className="place-picker-option"
                  role="option"
                  aria-selected={item.value === value}
                  onClick={() => {
                    onChange(item.value);
                    close();
                  }}
                >
                  <span>{item.label}</span>
                  {item.value === value && <IconCheck size={18} aria-hidden="true" />}
                </UnstyledButton>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
