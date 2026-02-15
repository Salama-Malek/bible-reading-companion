<?php

declare(strict_types=1);

namespace Api\Reading;

final class StreakCalculator
{
    /**
     * @param array<int, string> $orderedDates
     * @param array<string, bool> $completedByDate
     * @return array{currentStreak:int,longestStreak:int}
     */
    public function calculate(array $orderedDates, array $completedByDate): array
    {
        $currentStreak = 0;
        $longestStreak = 0;
        $runningStreak = 0;

        foreach ($orderedDates as $date) {
            if (($completedByDate[$date] ?? false) === true) {
                $runningStreak++;
                if ($runningStreak > $longestStreak) {
                    $longestStreak = $runningStreak;
                }

                continue;
            }

            $runningStreak = 0;
        }

        for ($index = count($orderedDates) - 1; $index >= 0; $index--) {
            $date = $orderedDates[$index];
            if (($completedByDate[$date] ?? false) !== true) {
                break;
            }

            $currentStreak++;
        }

        return [
            'currentStreak' => $currentStreak,
            'longestStreak' => $longestStreak,
        ];
    }
}
