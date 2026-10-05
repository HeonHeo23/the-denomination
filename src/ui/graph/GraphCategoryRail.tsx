import { Button } from "@/components/ui/button";
import { LayoutDashboard, Search } from "lucide-react";

interface GraphCategoryRailProps {
  readonly categories: readonly {
    readonly id: string;
    readonly label: string;
    readonly count: number;
  }[];
  readonly activeCategoryId?: string;
  readonly showingOverview: boolean;
  readonly disabled: boolean;
  readonly onSearchOpen: () => void;
  readonly onCategorySelect: (categoryId: string) => void;
  readonly onOverviewSelect: () => void;
}

export function GraphCategoryRail({
  categories,
  activeCategoryId,
  showingOverview,
  disabled,
  onSearchOpen,
  onCategorySelect,
  onOverviewSelect,
}: GraphCategoryRailProps) {
  return (
    <nav className="graph-category-rail" aria-label="Graph categories">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        data-game-node-search-trigger
        aria-label="Search nodes"
        aria-keyshortcuts="Control+K Meta+K"
        disabled={disabled}
        onClick={onSearchOpen}
      >
        <Search aria-hidden="true" />
      </Button>
      <div className="graph-category-rail__scroll" role="tablist">
        {categories.map((category) => (
          <Button
            key={category.id}
            type="button"
            size="sm"
            variant="ghost"
            role="tab"
            aria-selected={!showingOverview && activeCategoryId === category.id}
            data-active={!showingOverview && activeCategoryId === category.id}
            onClick={() => onCategorySelect(category.id)}
          >
            {category.label}
            <span aria-hidden="true">{category.count}</span>
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          role="tab"
          aria-selected={showingOverview}
          data-active={showingOverview}
          onClick={onOverviewSelect}
        >
          <LayoutDashboard data-icon="inline-start" /> Overview
        </Button>
      </div>
    </nav>
  );
}
