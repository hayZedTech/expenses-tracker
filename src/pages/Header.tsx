import type { JSX } from "react/jsx-runtime";

type Filter = "today" | "week" | "month" | "all";

export default function Header({
  filter,
  setFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchTerm,
  setSearchTerm,
  handleLogout,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  startDate: string | null;
  setStartDate: (d: string | null) => void;
  endDate: string | null;
  setEndDate: (d: string | null) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  handleLogout: () => Promise<void>;
}): JSX.Element {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow z-50  sm:h-40 md:h-[120px]">
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-0 md:h-full">
        {/* Desktop: keep exact original desktop layout (visible md+) */}
        <div className="hidden md:block h-full">
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 h-full">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">💰 Expense Tracker</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track spending, set budgets, and visualize your money.
              </p>
            </div>

            {/* Updated controls: filter select, date range, search, logout */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="px-3 py-2 rounded-lg border text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All</option>
              </select>

              <div className="flex items-center gap-2">
                <label className="text-sm">From</label>
                <input
                  type="date"
                  value={startDate ?? ""}
                  onChange={(e) =>
                    setStartDate(e.target.value === "" ? null : e.target.value)
                  }
                  className="px-3 py-2 rounded-lg border text-sm"
                  aria-label="Start date"
                />
                <label className="text-sm">To</label>
                <input
                  type="date"
                  value={endDate ?? ""}
                  onChange={(e) =>
                    setEndDate(e.target.value === "" ? null : e.target.value)
                  }
                  className="px-3 py-2 rounded-lg border text-sm"
                  aria-label="End date"
                />
              </div>

              <input
                type="text"
                placeholder="Search (e.g. Food, Transport, 1200)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm min-w-[180px]"
              />

              <button
                onClick={handleLogout}
                className="ml-1 bg-red-600 text-white px-2 py-2 rounded-lg text-sm cursor-pointer absolute right-4 top-4 md:static md:ml-1"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: stacked rows (visible on mobile only) */}
        <div className="block md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                  💰 Expense Tracker
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Track spending, set budgets, and visualize your money.
                </p>
              </div>
              <div>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">From</label>
              <input
                type="date"
                value={startDate ?? ""}
                onChange={(e) =>
                  setStartDate(e.target.value === "" ? null : e.target.value)
                }
                className="px-3 py-2 rounded-lg border text-sm flex-1"
                aria-label="Start date"
              />
              <label className="text-sm">To</label>
              <input
                type="date"
                value={endDate ?? ""}
                onChange={(e) =>
                  setEndDate(e.target.value === "" ? null : e.target.value)
                }
                className="px-3 py-2 rounded-lg border text-sm flex-1"
                aria-label="End date"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="px-3 py-2 rounded-lg border text-sm w-28"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <input
                type="text"
                placeholder="Search (e.g. Food, Transport, 1200)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
