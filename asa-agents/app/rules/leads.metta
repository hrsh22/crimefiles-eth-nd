;; Simple Metta rules for lead suggestion & consistency

;; If suspect mentions time and location, propose camera check lead
(= (!lead "Check corridor camera near time of death" "Witness" "Opportunity")
   (and (mentions-time ?s) (mentions-location ?s)))

;; If weapon is mentioned, propose provenance lead
(= (!lead "Verify letter opener provenance" "Means" "")
   (mentions-weapon ?s))

;; If alibi is mentioned, propose third-party validation lead
(= (!lead "Validate suspect alibi with independent witness" "Witness" "")
   (mentions-alibi ?s))

;; Consistency score heuristic: 0.6 base + 0.1 for weapon + 0.1 for time/location + 0.05 for alibi
(= (!consistency 0.85)
   (and (mentions-weapon ?s) (mentions-time ?s) (mentions-location ?s) (mentions-alibi ?s)))
(= (!consistency 0.8)
   (and (mentions-weapon ?s) (mentions-time ?s) (mentions-location ?s)))
(= (!consistency 0.7)
   (and (mentions-time ?s) (mentions-location ?s)))
(= (!consistency 0.65)
   (and (mentions-weapon ?s) (mentions-alibi ?s)))
(= (!consistency 0.6) true)


