"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  QuickRangeKey,
  QuickRangeInfo,
  DashboardData,
  RoomSummaryItem,
  LatestEvidencePhoto,
  ActionItem,
} from "@/types/dashboard";

import { HeroFilterBanner } from "@/components/admin/HeroFilterBanner";
import { CakupanDataFilter } from "@/components/admin/CakupanDataFilter";
import { KpiMetricCards } from "@/components/admin/KpiMetricCards";
import { RoomMatrixSection } from "@/components/admin/RoomMatrixSection";
import { AttentionItemsCard } from "@/components/admin/AttentionItemsCard";
import { LatestEvidenceCard } from "@/components/admin/LatestEvidenceCard";
import { PeriodAnalysisSection } from "@/components/admin/PeriodAnalysisSection";
import { RecentActivityFeed } from "@/components/admin/RecentActivityFeed";
import { RoomDetailModal } from "@/components/admin/RoomDetailModal";
import { FindingsDetailModal } from "@/components/admin/FindingsDetailModal";
import { EvidenceLightboxModal } from "@/components/admin/EvidenceLightboxModal";

function getQuickRangeDates(key: QuickRangeKey): QuickRangeInfo {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatYMD(now);

  if (key === "KEMARIN") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = formatYMD(yesterday);
    return {
      startDate: yStr,
      endDate: yStr,
      label: "Kemarin",
      badgeText: "KEMARIN",
      displayDate: new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(yesterday),
      daysCount: 1,
    };
  }

  if (key === "1_MINGGU") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    return {
      startDate: formatYMD(weekAgo),
      endDate: todayStr,
      label: "1 minggu",
      badgeText: "1 MINGGU",
      displayDate: `${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
      }).format(weekAgo)} - ${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(now)}`,
      daysCount: 7,
    };
  }

  if (key === "1_BULAN") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: formatYMD(monthStart),
      endDate: todayStr,
      label: "1 bulan",
      badgeText: "1 BULAN",
      displayDate: new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(now),
      daysCount: Math.max(1, now.getDate()),
    };
  }

  if (key === "SEMESTER") {
    const semStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const diffDays = Math.max(
      1,
      Math.ceil((now.getTime() - semStart.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      startDate: formatYMD(semStart),
      endDate: todayStr,
      label: "Semester",
      badgeText: "SEMESTER",
      displayDate: `${new Intl.DateTimeFormat("id-ID", {
        month: "short",
      }).format(semStart)} - ${new Intl.DateTimeFormat("id-ID", {
        month: "short",
        year: "numeric",
      }).format(now)}`,
      daysCount: diffDays,
    };
  }

  // Default: HARI_INI
  return {
    startDate: todayStr,
    endDate: todayStr,
    label: "Hari ini",
    badgeText: "HARI INI",
    displayDate: new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    daysCount: 1,
  };
}

export default function DashboardSummaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [showFindingsModal, setShowFindingsModal] = useState(false);

  // Quick range state
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRangeKey>("HARI_INI");
  const currentQuickInfo = useMemo(
    () => getQuickRangeDates(activeQuickRange),
    [activeQuickRange]
  );

  // Filter state
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [appliedRoomFilter, setAppliedRoomFilter] = useState("ALL");
  const [appliedPeriod, setAppliedPeriod] = useState(currentMonthKey);
  const [pendingRoomFilter, setPendingRoomFilter] = useState("ALL");
  const [pendingPeriod, setPendingPeriod] = useState(currentMonthKey);
  const [statusRoomFilter, setStatusRoomFilter] = useState<
    "ALL" | "FINDINGS" | "PARTIAL" | "COMPLETE"
  >("ALL");
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [actionItemFilter, setActionItemFilter] = useState<"ALL" | "FINDINGS" | "PENDING">("ALL");
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [selectedDetailRoom, setSelectedDetailRoom] = useState<RoomSummaryItem | null>(null);
  const [selectedEvidencePhoto, setSelectedEvidencePhoto] = useState<LatestEvidencePhoto | null>(null);
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const [isEvidencePaused, setIsEvidencePaused] = useState(false);

  const latestPhotosList = useMemo(
    () => dashboardData?.latestPhotos || [],
    [dashboardData?.latestPhotos]
  );

  // Auto-cycle 10 latest evidence photos every 7s
  useEffect(() => {
    if (!latestPhotosList.length || isEvidencePaused) return;
    const timer = setInterval(() => {
      setActiveEvidenceIndex((prev) => (prev + 1) % latestPhotosList.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [latestPhotosList.length, isEvidencePaused]);

  // Keyboard shortcut listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedEvidencePhoto) setSelectedEvidencePhoto(null);
        else if (selectedDetailRoom) setSelectedDetailRoom(null);
        else if (showFindingsModal) setShowFindingsModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEvidencePhoto, selectedDetailRoom, showFindingsModal]);

  const hasFilterActive = appliedRoomFilter !== "ALL" || appliedPeriod !== currentMonthKey;
  const filterPeriodLabel = useMemo(() => {
    if (!appliedPeriod) return "";
    const [y, m] = appliedPeriod.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
      new Date(y, m - 1, 1)
    );
  }, [appliedPeriod]);

  const pendingRoomOptions = useMemo(() => {
    const visible = roomsData.filter((r: any) => !r.hidden);
    return [
      { value: "ALL", label: "Semua ruangan" },
      ...visible.map((r: any) => ({ value: r.id, label: r.name })),
    ];
  }, [roomsData]);

  const filteredKpi = useMemo(() => {
    if (!dashboardData?.summary) return { rate: 0, completed: 0, total: 0, isFiltered: false };
    return {
      rate: dashboardData.summary.completionRate ?? 0,
      completed: dashboardData.summary.completedSessions ?? 0,
      total: dashboardData.summary.totalExpectedSessions ?? 0,
      isFiltered: activeQuickRange !== "HARI_INI" || hasFilterActive,
    };
  }, [dashboardData, activeQuickRange, hasFilterActive]);

  const loadData = useCallback(
    async (
      roomId = appliedRoomFilter,
      month = appliedPeriod,
      rangeKey = activeQuickRange
    ) => {
      setLoading(true);
      let rangeInfo = getQuickRangeDates(rangeKey);

      if (month && month !== currentMonthKey && rangeKey === "HARI_INI") {
        const [y, m] = month.split("-").map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        rangeInfo = {
          startDate: `${month}-01`,
          endDate: `${month}-${String(daysInMonth).padStart(2, "0")}`,
          daysCount: daysInMonth,
          label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
            new Date(y, m - 1, 1)
          ),
          badgeText: "BULANAN",
          displayDate: new Intl.DateTimeFormat("id-ID", {
            month: "long",
            year: "numeric",
          }).format(new Date(y, m - 1, 1)),
        };
      }

      try {
        const [dashRes, roomsRes] = await Promise.all([
          fetch(
            `/api/admin/dashboard?month=${month}&startDate=${rangeInfo.startDate}&endDate=${rangeInfo.endDate}&daysCount=${rangeInfo.daysCount}${
              roomId !== "ALL" ? `&roomId=${roomId}` : ""
            }`
          ).then((r) => r.json()),
          fetch("/api/admin/rooms").then((r) => r.json()),
        ]);
        if (dashRes.ok) setDashboardData(dashRes.data);
        if (roomsRes.ok)
          setRoomsData((roomsRes.data.rooms || []).filter((r: any) => !r.hidden));
      } catch (err) {
        console.error("Gagal memuat ringkasan:", err);
      } finally {
        setLoading(false);
      }
    },
    [appliedRoomFilter, appliedPeriod, activeQuickRange, currentMonthKey]
  );

  const handleQuickRangeChange = async (key: QuickRangeKey) => {
    setActiveQuickRange(key);
    await loadData(appliedRoomFilter, appliedPeriod, key);
  };

  const handleApplyFilter = async () => {
    setAppliedRoomFilter(pendingRoomFilter);
    setAppliedPeriod(pendingPeriod);
    await loadData(pendingRoomFilter, pendingPeriod, activeQuickRange);
  };

  const pendingIsDirty =
    pendingRoomFilter !== appliedRoomFilter || pendingPeriod !== appliedPeriod;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReopen = async (inspectionId: string) => {
    if (
      !confirm(
        "Buka kembali laporan ini? Laporan akan dihapus dan petugas dapat mengisi ulang untuk slot/hari tersebut."
      )
    )
      return;
    setReopenId(inspectionId);
    try {
      const res = await fetch("/api/admin/inspections/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.message || "Gagal membuka kembali laporan.");
      alert(data.message);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal membuka kembali laporan.");
    } finally {
      setReopenId(null);
    }
  };

  const todayTimeFormatted = useMemo(() => {
    const now = new Date();
    return (
      new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now) + " WIB"
    );
  }, []);

  // Filtered room summaries
  const filteredRoomSummaries = useMemo(() => {
    if (!dashboardData?.roomSummaries) return [];
    return dashboardData.roomSummaries.filter((r) => {
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (statusRoomFilter === "FINDINGS") return r.hasFindings || r.dirtyCount > 0;
      if (statusRoomFilter === "COMPLETE") return r.status === "COMPLETE";
      if (statusRoomFilter === "PARTIAL")
        return (
          r.status === "PARTIAL" || r.status === "WAITING_SPV" || r.status === "EMPTY"
        );
      return true;
    });
  }, [dashboardData, roomSearchQuery, statusRoomFilter]);

  // Action items
  const { actionCounts, filteredActionItems } = useMemo(() => {
    if (!dashboardData?.roomSummaries) {
      return {
        actionCounts: { all: 0, findings: 0, pending: 0 },
        filteredActionItems: [],
      };
    }
    const list: ActionItem[] = [];

    dashboardData.roomSummaries.forEach((r) => {
      if (r.status !== "COMPLETE") {
        if (r.petugasFinished < r.petugasTotal) {
          list.push({
            id: `${r.id}-petugas`,
            roomName: r.name,
            slotName: "Petugas",
            desc: "Belum dilakukan pada hari ini.",
            status: "Belum selesai",
            type: "PENDING",
          });
        }
        if (r.spvFinished < r.spvTotal) {
          list.push({
            id: `${r.id}-spv`,
            roomName: r.name,
            slotName: "Inspeksi SPV",
            desc: "Belum dilakukan inspeksi pengawas.",
            status: "Belum selesai",
            type: "PENDING",
          });
        }
      }
    });

    if (dashboardData.findings) {
      dashboardData.findings.forEach((f) => {
        list.unshift({
          id: `finding-${f.id}`,
          roomName: f.roomName,
          slotName: f.slotName,
          desc: f.note || "Temuan kotor/rusak",
          status: "Perlu ditinjau",
          type: "FINDINGS",
        });
      });
    }

    const all = list.length;
    const findings = list.filter((i) => i.type === "FINDINGS").length;
    const pending = list.filter((i) => i.type === "PENDING").length;

    let filtered = list;
    if (actionItemFilter === "FINDINGS") filtered = list.filter((i) => i.type === "FINDINGS");
    else if (actionItemFilter === "PENDING")
      filtered = list.filter((i) => i.type === "PENDING");

    return {
      actionCounts: { all, findings, pending },
      filteredActionItems: filtered,
    };
  }, [dashboardData, actionItemFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Hero Banner with Quick Filters */}
      <HeroFilterBanner
        currentQuickInfo={currentQuickInfo}
        activeQuickRange={activeQuickRange}
        onQuickRangeChange={handleQuickRangeChange}
        loading={loading}
        todayTimeFormatted={todayTimeFormatted}
      />

      {/* 2. Filter Bar (Cakupan Data) */}
      <CakupanDataFilter
        hasFilterActive={hasFilterActive}
        filterPeriodLabel={filterPeriodLabel}
        pendingRoomOptions={pendingRoomOptions}
        appliedRoomFilter={appliedRoomFilter}
        pendingRoomFilter={pendingRoomFilter}
        setPendingRoomFilter={setPendingRoomFilter}
        pendingPeriod={pendingPeriod}
        setPendingPeriod={setPendingPeriod}
        pendingIsDirty={pendingIsDirty}
        onApplyFilter={handleApplyFilter}
        loading={loading}
      />

      {/* 3. Four Metric KPI Cards */}
      <KpiMetricCards
        loading={loading}
        currentQuickInfo={currentQuickInfo}
        activeQuickRange={activeQuickRange}
        hasFilterActive={hasFilterActive}
        filteredKpi={filteredKpi}
        dashboardData={dashboardData}
        totalRoomsCount={roomsData.length}
        onFilterPartialRooms={() => {
          setStatusRoomFilter("PARTIAL");
          document
            .getElementById("rooms-matrix-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onFilterCompleteRooms={() => {
          setStatusRoomFilter("COMPLETE");
          document
            .getElementById("rooms-matrix-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onOpenFindingsModal={() => setShowFindingsModal(true)}
        onOpenEvaluations={() => router.push("/admin/evaluations")}
      />

      {/* 4. Ruangan Hari Ini & Item Perhatian Grid */}
      <section id="rooms-matrix-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Matriks Ruangan */}
        <div className="lg:col-span-8">
          <RoomMatrixSection
            roomSearchQuery={roomSearchQuery}
            setRoomSearchQuery={setRoomSearchQuery}
            statusRoomFilter={statusRoomFilter}
            setStatusRoomFilter={setStatusRoomFilter}
            totalRoomsCount={dashboardData?.roomSummaries?.length || 0}
            findingRoomsCount={dashboardData?.summary?.findingCount || 0}
            greenRoomsCount={dashboardData?.summary?.greenCount || 0}
            filteredRooms={filteredRoomSummaries}
            loading={loading}
            onSelectRoom={setSelectedDetailRoom}
          />
        </div>

        {/* Right: Stacked Column: Item Perhatian + Dokumentasi Evidence Terakhir */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4 h-full">
          <AttentionItemsCard
            actionCounts={actionCounts}
            actionItemFilter={actionItemFilter}
            setActionItemFilter={setActionItemFilter}
            filteredActionItems={filteredActionItems}
            loading={loading}
          />

          <LatestEvidenceCard
            latestPhotosList={latestPhotosList}
            activeEvidenceIndex={activeEvidenceIndex}
            setActiveEvidenceIndex={setActiveEvidenceIndex}
            isEvidencePaused={isEvidencePaused}
            setIsEvidencePaused={setIsEvidencePaused}
            loading={loading}
            onSelectPhoto={setSelectedEvidencePhoto}
          />
        </div>
      </section>

      {/* 5. Analisis Periode & Chart Tren Operasional */}
      <PeriodAnalysisSection
        appliedPeriod={appliedPeriod}
        dashboardData={dashboardData}
        loading={loading}
      />

      {/* 6. Aktivitas Terbaru (Recent Activity Feed) */}
      <RecentActivityFeed
        recentActivities={dashboardData?.recentActivities || []}
        onReopen={handleReopen}
        reopenId={reopenId}
      />

      {/* Modal Detail Ruangan Hari Ini */}
      <RoomDetailModal
        room={selectedDetailRoom}
        displayDate={currentQuickInfo.displayDate}
        onClose={() => setSelectedDetailRoom(null)}
        onOpenPhotoLightbox={setSelectedEvidencePhoto}
      />

      {/* Findings Detail Modal */}
      <FindingsDetailModal
        isOpen={showFindingsModal}
        onClose={() => setShowFindingsModal(false)}
        findings={dashboardData?.findings || []}
        roomsData={roomsData}
        onSelectRoomById={setSelectedDetailRoom}
        onApplyAttentionFilter={() => {
          setShowFindingsModal(false);
          setActionItemFilter("FINDINGS");
          document
            .getElementById("rooms-matrix-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {/* Modal Preview Foto Evidence Lightbox */}
      <EvidenceLightboxModal
        photo={selectedEvidencePhoto}
        onClose={() => setSelectedEvidencePhoto(null)}
      />
    </div>
  );
}
