-- MULCV GeoArchives - schema initial PostgreSQL
-- A executer UNE SEULE FOIS sur une base vide.
-- L'application ne cree pas les tables au demarrage: elle lit et ecrit uniquement dans ces tables.
CREATE TYPE "public"."confidentiality_level" AS ENUM('low', 'internal', 'confidential', 'critical');
CREATE TYPE "public"."evidence_document_type" AS ENUM('visit_report', 'photo', 'floor_plan', 'inventory', 'transfer_slip', 'signed_form', 'risk_report', 'quality_report', 'acceptance_certificate');
CREATE TYPE "public"."mission_status" AS ENUM('planned', 'ready', 'in_progress', 'blocked', 'completed');
CREATE TYPE "public"."processing_recommendation" AS ENUM('treat_on_site', 'transfer_to_center', 'digitize_on_site', 'centralized_digitization', 'urgent_backup', 'pre_processing_required', 'secure_temporary_storage');
CREATE TYPE "public"."site_status" AS ENUM('not_evaluated', 'evaluation_scheduled', 'evaluation_done', 'mobilization_in_progress', 'archival_processing', 'digitization_in_progress', 'quality_control', 'completed', 'high_risk', 'inaccessible');
CREATE TYPE "public"."site_type" AS ENUM('central_direction', 'regional_direction', 'departmental_direction', 'agency', 'archive_depot', 'archive_room', 'temporary_processing_center', 'ceiba_storage_site', 'mobile_digitization_unit');
CREATE TYPE "public"."territory_type" AS ENUM('district', 'region', 'department', 'sub_prefecture', 'commune');
CREATE TABLE "administrative_territories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" text NOT NULL,
	"type" "territory_type" NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "archival_funds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"title" text NOT NULL,
	"series" text,
	"support_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"date_start" integer,
	"date_end" integer,
	"linear_meters" numeric(12, 2) DEFAULT '0' NOT NULL,
	"boxes" integer DEFAULT 0 NOT NULL,
	"files" integer DEFAULT 0 NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"classification_state" varchar(120) NOT NULL,
	"confidentiality" "confidentiality_level" DEFAULT 'internal' NOT NULL
);

CREATE TABLE "archive_rooms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"room_type" varchar(80) NOT NULL,
	"surface_m2" numeric(10, 2),
	"shelf_count" integer DEFAULT 0 NOT NULL,
	"ventilation_condition" varchar(80),
	"security_notes" text
);

CREATE TABLE "archive_sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid,
	"site_type" "site_type" NOT NULL,
	"status" "site_status" DEFAULT 'evaluation_scheduled' NOT NULL,
	"district" text NOT NULL,
	"region" text NOT NULL,
	"department" text NOT NULL,
	"sub_prefecture" text,
	"city" text NOT NULL,
	"commune" text,
	"address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"map_x" integer DEFAULT 50 NOT NULL,
	"map_y" integer DEFAULT 50 NOT NULL,
	"access_landmarks" text,
	"accessibility" varchar(80) DEFAULT 'accessible' NOT NULL,
	"total_agents" integer,
	"archive_rooms_count" integer DEFAULT 0 NOT NULL,
	"storage_capacity_ml" numeric(12, 2),
	"linear_meters" numeric(12, 2) DEFAULT '0' NOT NULL,
	"estimated_boxes" integer DEFAULT 0 NOT NULL,
	"estimated_files" integer DEFAULT 0 NOT NULL,
	"estimated_pages" integer DEFAULT 0 NOT NULL,
	"document_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"date_range_start" integer,
	"date_range_end" integer,
	"confidentiality" "confidentiality_level" DEFAULT 'internal' NOT NULL,
	"has_inventory" boolean DEFAULT false NOT NULL,
	"has_electricity" boolean DEFAULT false NOT NULL,
	"has_internet" boolean DEFAULT false NOT NULL,
	"has_access_control" boolean DEFAULT false NOT NULL,
	"has_fire_detection" boolean DEFAULT false NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"next_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" varchar(100) NOT NULL,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "digitization_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"status" varchar(80) DEFAULT 'preparation' NOT NULL,
	"pages_prepared" integer DEFAULT 0 NOT NULL,
	"pages_scanned" integer DEFAULT 0 NOT NULL,
	"documents_indexed" integer DEFAULT 0 NOT NULL,
	"rejected_documents" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_tag" varchar(60) NOT NULL,
	"type" varchar(80) NOT NULL,
	"label" text NOT NULL,
	"status" varchar(80) DEFAULT 'available' NOT NULL,
	"assigned_team_id" uuid
);

CREATE TABLE "evidence_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"mission_id" uuid,
	"type" "evidence_document_type" NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"storage_provider" varchar(80) DEFAULT 's3-compatible' NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer,
	"checksum_sha256" varchar(80),
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "mission_sites" (
	"mission_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"planned_sequence" integer DEFAULT 1 NOT NULL,
	"checklist_ready" boolean DEFAULT false NOT NULL,
	"transfer_required" boolean DEFAULT false NOT NULL,
	CONSTRAINT "mission_sites_mission_id_site_id_pk" PRIMARY KEY("mission_id","site_id")
);

CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" text NOT NULL,
	"status" "mission_status" DEFAULT 'planned' NOT NULL,
	"region_scope" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"lead_team_id" uuid,
	"objective" text NOT NULL,
	"vehicle_needs" integer DEFAULT 0 NOT NULL,
	"scanner_needs" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "operational_metrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"metric_date" date NOT NULL,
	"boxes_identified" integer DEFAULT 0 NOT NULL,
	"boxes_collected" integer DEFAULT 0 NOT NULL,
	"linear_meters_processed" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pages_prepared" integer DEFAULT 0 NOT NULL,
	"pages_scanned" integer DEFAULT 0 NOT NULL,
	"documents_indexed" integer DEFAULT 0 NOT NULL,
	"quality_checks" integer DEFAULT 0 NOT NULL,
	"documents_validated" integer DEFAULT 0 NOT NULL,
	"documents_rejected" integer DEFAULT 0 NOT NULL,
	"ged_integrated" integer DEFAULT 0 NOT NULL,
	"sae_transferred" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" text NOT NULL,
	"ministry" text DEFAULT 'MULCV' NOT NULL,
	"organization_type" varchar(80) NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quality_controls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"batch_id" uuid NOT NULL,
	"controller_name" text NOT NULL,
	"checked_documents" integer DEFAULT 0 NOT NULL,
	"accepted_documents" integer DEFAULT 0 NOT NULL,
	"rejected_documents" integer DEFAULT 0 NOT NULL,
	"rejection_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" varchar(100) NOT NULL,
	"phone" varchar(60),
	"email" varchar(180),
	"can_validate" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_evaluations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluator_name" text NOT NULL,
	"physical_state_score" integer NOT NULL,
	"humidity_score" integer NOT NULL,
	"security_score" integer NOT NULL,
	"inventory_score" integer NOT NULL,
	"sensitivity_score" integer NOT NULL,
	"access_score" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"priority_score" integer NOT NULL,
	"recommendation" "processing_recommendation" NOT NULL,
	"notes" text,
	"raw_answers" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" varchar(100) NOT NULL,
	"phone" varchar(60),
	"email" varchar(180)
);

CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" text NOT NULL,
	"specialty" varchar(100) NOT NULL,
	"home_base" text
);

CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"mission_id" uuid,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"boxes_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(80) DEFAULT 'planned' NOT NULL,
	"planned_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plate_number" varchar(40) NOT NULL,
	"label" text NOT NULL,
	"status" varchar(80) DEFAULT 'available' NOT NULL,
	"assigned_team_id" uuid
);

ALTER TABLE "archival_funds" ADD CONSTRAINT "archival_funds_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "archive_rooms" ADD CONSTRAINT "archive_rooms_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "archive_sites" ADD CONSTRAINT "archive_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "archive_sites" ADD CONSTRAINT "archive_sites_territory_id_administrative_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."administrative_territories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "digitization_batches" ADD CONSTRAINT "digitization_batches_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mission_sites" ADD CONSTRAINT "mission_sites_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_sites" ADD CONSTRAINT "mission_sites_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_lead_team_id_teams_id_fk" FOREIGN KEY ("lead_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_batch_id_digitization_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."digitization_batches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_contacts" ADD CONSTRAINT "site_contacts_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_evaluations" ADD CONSTRAINT "site_evaluations_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_site_id_archive_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."archive_sites"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "territories_code_unique" ON "administrative_territories" USING btree ("code");
CREATE INDEX "territories_type_name_idx" ON "administrative_territories" USING btree ("type","name");
CREATE INDEX "archival_funds_site_idx" ON "archival_funds" USING btree ("site_id");
CREATE INDEX "archive_rooms_site_idx" ON "archive_rooms" USING btree ("site_id");
CREATE UNIQUE INDEX "archive_sites_code_unique" ON "archive_sites" USING btree ("code");
CREATE INDEX "archive_sites_region_idx" ON "archive_sites" USING btree ("region");
CREATE INDEX "archive_sites_status_idx" ON "archive_sites" USING btree ("status");
CREATE INDEX "archive_sites_risk_idx" ON "archive_sites" USING btree ("risk_score");
CREATE INDEX "archive_sites_coordinates_idx" ON "archive_sites" USING btree ("latitude","longitude");
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");
CREATE UNIQUE INDEX "digitization_batches_code_unique" ON "digitization_batches" USING btree ("code");
CREATE INDEX "evidence_documents_site_idx" ON "evidence_documents" USING btree ("site_id");
CREATE UNIQUE INDEX "missions_code_unique" ON "missions" USING btree ("code");
CREATE INDEX "operational_metrics_site_date_idx" ON "operational_metrics" USING btree ("site_id","metric_date");
CREATE UNIQUE INDEX "organizations_code_unique" ON "organizations" USING btree ("code");
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");
CREATE INDEX "quality_controls_batch_idx" ON "quality_controls" USING btree ("batch_id");
CREATE INDEX "site_contacts_site_idx" ON "site_contacts" USING btree ("site_id");
CREATE INDEX "site_evaluations_site_idx" ON "site_evaluations" USING btree ("site_id");
CREATE INDEX "team_members_team_idx" ON "team_members" USING btree ("team_id");
CREATE INDEX "transfers_site_idx" ON "transfers" USING btree ("site_id");